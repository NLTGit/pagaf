#!/usr/bin/env python3
""" A wrapper for a few of the most common things maintainers will do with CloudFormation """
import argparse
import json
from pathlib import Path
import subprocess
import sys

def parsed_cli():
    ap = argparse.ArgumentParser('Deploy Pagaf')
    ap.add_argument('--stack-name', required=True,
        help='For development, use a stack name unique to you')
    sps = ap.add_subparsers(dest='command', required=True)

    sps.add_parser('create')
    sps.add_parser('update')
    sps.add_parser('delete')
    sps.add_parser('info')

    return ap.parse_args()


def cloud_form(subcommand, stack_name, *args, **kwargs):
    result = subprocess.run(
        ('aws', '--output', 'json', 'cloudformation', subcommand)
            + args
            + ('--stack-name', stack_name),
        check=True,
        **kwargs)
    return result


def outputs(stack_name):
    described = cloud_form('describe-stacks', stack_name, capture_output=True)
    stacks = json.loads(described.stdout)['Stacks']
    return {x['OutputKey']: x['OutputValue'] for x in stacks[0]['Outputs']}


project = Path(__file__).parent
template = project/'pagaf.yaml'

def create(stack_name):
    cloud_form('create-stack', stack_name, '--template-body', 'file://%s' % template )
    cloud_form('wait', stack_name, 'stack-create-complete')
    out = outputs(stack_name)
    sync(out['PagafSiteBucket'])
    print(out['PagafSiteUrl'])


def update(stack_name):
    try:
        up = cloud_form('update-stack', stack_name, '--template-body', 'file://%s' % template,
            capture_output=True)
        show_output(up)
    except subprocess.CalledProcessError as e:
        if 'No updates are to be performed' not in e.stderr.decode('ascii'):
            show_output(e)
            raise
    cloud_form('wait', stack_name, 'stack-update-complete')
    out = outputs(stack_name)
    sync(out['PagafSiteBucket'])
    print(out['PagafSiteUrl'])


def delete(stack_name):
    cloud_form('delete-stack', stack_name)
    cloud_form('wait', stack_name, 'stack-delete-complete')  # Delete can be slow


def info(stack_name):
    print('\n'.join('%s %s' % v for v in outputs(stack_name).items()))


def show_output(proc):
    sys.stdout.write(proc.stdout.decode('ascii'))
    sys.stderr.write(proc.stderr.decode('ascii'))


def sync(public_bucket):
    site_source = project/'site'
    subprocess.run(
        ['aws', 's3', 'sync', '--acl', 'public-read', site_source, 's3://%s' % public_bucket],
        check=True)


if __name__ == '__main__':
    cli_args = parsed_cli()
    if cli_args.command == 'create': create(cli_args.stack_name)
    if cli_args.command == 'update': update(cli_args.stack_name)
    if cli_args.command == 'delete': delete(cli_args.stack_name)
    if cli_args.command == 'info': info(cli_args.stack_name)
